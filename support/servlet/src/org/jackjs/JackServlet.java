package org.jackjs;
import java.io.IOException;
import javax.servlet.http.*;
import javax.servlet.*;

import java.io.*;

import org.mozilla.javascript.*;

@SuppressWarnings("serial")
public class JackServlet extends HttpServlet {
	private Scriptable scope;
	private Function app;
	private Function handler;
	
    public void init(ServletConfig config) throws ServletException {
    	super.init(config);

		final String modulePath = getServletContext().getRealPath(getInitParam(config, "modulePath", "WEB-INF/app"));
		final String module = getInitParam(config, "module", "app.js");
		final String function = getInitParam(config, "function", null);
    	
		final String narwhalHome = getServletContext().getRealPath("WEB-INF/narwhal");
		final String narwhalFilename = "narwhal-rhino.js";
		
		Context context = Context.enter();
		try {
			scope = new ImporterTopLevel(context);
			
			ScriptableObject.putProperty(scope, "NARWHAL_HOME",  Context.javaToJS(narwhalHome, scope));
			//ScriptableObject.putProperty(scope, "$DEBUG",  Context.javaToJS(true, scope));
			
			// load Narwhal
			context.evaluateReader(scope, new FileReader(narwhalHome+"/"+narwhalFilename), narwhalFilename, 1, null);
			
			// load Servlet handler "process" method
			handler = (Function)context.evaluateString(scope, "require('jack/handler/servlet').Servlet.process;", null, 1, null);
			
			// load the app
			Object possibleApp = context.evaluateReader(scope, new FileReader(modulePath+"/"+module), module, 1, null);
			if (function != null)
				possibleApp = scope.get(function, scope);
			
			if (possibleApp instanceof Function)
				app = (Function)possibleApp;
			
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			Context.exit();
		}
    }
    
	public void service(HttpServletRequest request, HttpServletResponse response) throws IOException {
		Context context = Context.enter();
		try	{
			Object args[] = {app, request, response};
			handler.call(context, scope, null, args);
		} finally {
			Context.exit();
		}
	}
	
	private String getInitParam(ServletConfig config, String name, String defaultValue) {
        String value = config.getInitParameter(name);
        return value == null ? defaultValue : value;
    }
}
